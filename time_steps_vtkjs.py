import os
import numpy as np
# import paraview
#paraview.compatibility.major = 5
#paraview.compatibility.minor = 10

from paraview.simple import *

#### disable automatic camera reset on 'Show'
paraview.simple._DisableFirstRenderCameraReset()

# get active view
renderView1 = GetActiveViewOrCreate('RenderView')

# get active source.
solutionpvd = GetActiveSource()

output_directory = os.path.dirname(solutionpvd.FileName)
output_name      = '/solution'

output_times = solutionpvd.TimestepValues.GetData()

print (output_directory + output_name)

counter  = 1
filename = []

for i in range(len(output_times)):
    # export view
    file_name = output_directory + output_name + format(counter, '04d') + '.vtkjs'
    ExportView(file_name, view=renderView1, ParaViewGlanceHTML='')

    # get animation scene
    animationScene1 = GetAnimationScene()
    animationScene1.GoToNext()
    counter += 1    
    filename.append(file_name)

time_steps = np.arange(0, len(output_times))
np.savetxt(output_directory + '/filename_time_steps.csv', np.column_stack((time_steps.astype(np.object), 
           filename)), fmt='%s')
